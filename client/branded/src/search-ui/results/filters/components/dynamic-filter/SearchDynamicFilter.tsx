import { FC, ReactNode, useMemo, useState } from 'react'

import { mdiClose, mdiSourceRepository } from '@mdi/js'
import classNames from 'classnames'

import { displayRepoName } from '@sourcegraph/shared/src/components/RepoLink'
import { UserAvatar } from '@sourcegraph/shared/src/components/UserAvatar'
import type { Filter } from '@sourcegraph/shared/src/search/stream'
import { useExperimentalFeatures } from '@sourcegraph/shared/src/settings/settings'
import { SymbolKind } from '@sourcegraph/shared/src/symbols/SymbolKind'
import { Badge, Button, Icon, H4, Input, LanguageIcon, Code, Tooltip } from '@sourcegraph/wildcard'

import { codeHostIcon } from '../../../../components'
import { URLQueryFilter } from '../../hooks'

import styles from './SearchDynamicFilter.module.scss'

const MAX_FILTERS_NUMBER = 5

interface SearchDynamicFilterProps {
    /** Name title of the filter section */
    title: string

    /**
     * Specifies which type filter we want to render in this particular
     * filter section, it could be lang filter, repo filter, or file filters.
     */
    filterKind: Filter['kind']

    /**
     * The set of filters that are selected. This is the state that is stored
     * in the URL.
     */
    selectedFilters: URLQueryFilter[]

    /**
     * List of streamed filters from search stream API
     */
    filters?: Filter[]

    /** Exposes render API to render some custom filter item in the list */
    renderItem?: (filter: Filter) => ReactNode

    /**
     * It's called whenever user changes (pick/reset) any filters in the filter panel.
     * @param nextQuery
     */
    onSelectedFilterChange: (filters: URLQueryFilter[]) => void
}

/**
 * Dynamic filter panel section. It renders dynamically generated filters which
 * come from the search stream API.
 */
export const SearchDynamicFilter: FC<SearchDynamicFilterProps> = ({
    title,
    filters,
    filterKind,
    selectedFilters,
    renderItem,
    onSelectedFilterChange,
}) => {
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [visibleFilters, setVisibleFilters] = useState<number>(MAX_FILTERS_NUMBER)

    const relevantSelectedFilters = selectedFilters.filter(sf => sf.kind === filterKind)
    const relevantFilters = filters?.filter(f => f.kind === filterKind) ?? []
    const isSelected = (filter: Filter): boolean =>
        relevantSelectedFilters.find(sf => filtersEqual(filter, sf)) !== undefined

    const mergedFilters = [
        // Selected filters come first, but we want to map them to the backend filters to get the relevant count and exhaustiveness
        ...relevantSelectedFilters.map(
            sf => filters?.find(f => filtersEqual(f, sf)) ?? { ...sf, count: 0, exhaustive: true }
        ),
        // Followed by filters from the backend, but excluding the ones we already listed
        ...relevantFilters.filter(f => relevantSelectedFilters.find(sf => filtersEqual(f, sf)) === undefined),
    ]

    const handleFilterClick = (filter: URLQueryFilter, remove?: boolean): void => {
        if (remove) {
            onSelectedFilterChange(selectedFilters.filter(f => !filtersEqual(f, filter)))
        } else {
            onSelectedFilterChange([...selectedFilters, filter])
        }
    }

    if (mergedFilters.length === 0) {
        return null
    }

    const lowerSearchTerm = searchTerm.toLowerCase()
    const filteredFilters = mergedFilters.filter(filter => filter.label.toLowerCase().includes(lowerSearchTerm))
    const filtersToShow =
        filteredFilters.length <= visibleFilters ? filteredFilters : filteredFilters.slice(0, visibleFilters)
    const allFiltersDisplayed = visibleFilters >= filteredFilters.length

    const moreOrLessFilters = (): void => {
        const filtersDisplayed = visibleFilters + MAX_FILTERS_NUMBER

        if (allFiltersDisplayed) {
            // setAllFiltersDisplayed(false)
            setVisibleFilters(MAX_FILTERS_NUMBER)
            return
        }

        if (filteredFilters.length <= filtersDisplayed) {
            setVisibleFilters(filtersDisplayed)
            // setAllFiltersDisplayed(true)
            return
        }

        setVisibleFilters(filtersDisplayed)
    }

    return (
        <div className={styles.root}>
            <H4 className={styles.heading}>{title}</H4>

            {mergedFilters.length > MAX_FILTERS_NUMBER && (
                <Input
                    variant="small"
                    value={searchTerm}
                    placeholder={`Filter ${filterKind}`}
                    onChange={event => setSearchTerm(event.target.value)}
                />
            )}

            <ul className={styles.list}>
                {filtersToShow.map(filter => (
                    <DynamicFilterItem
                        key={filter.value}
                        filter={filter}
                        selected={isSelected(filter)}
                        renderItem={renderItem}
                        onClick={handleFilterClick}
                    />
                ))}
            </ul>
            {filteredFilters.length > MAX_FILTERS_NUMBER && (
                <Button variant="link" size="sm" onClick={() => moreOrLessFilters()}>
                    {allFiltersDisplayed ? `Show less ${filterKind}s` : `Show more ${filterKind}s`}
                </Button>
            )}
        </div>
    )
}

interface DynamicFilterItemProps {
    filter: Filter
    selected: boolean
    renderItem?: (filter: Filter) => ReactNode
    onClick: (filter: URLQueryFilter, remove?: boolean) => void
}

const DynamicFilterItem: FC<DynamicFilterItemProps> = props => {
    const { filter, selected, renderItem, onClick } = props

    return (
        <li key={filter.value}>
            <Button
                variant={selected ? 'primary' : 'secondary'}
                outline={!selected}
                className={classNames(styles.item, { [styles.itemSelected]: selected })}
                onClick={() => onClick(filter, selected)}
            >
                <span className={styles.itemText}>{renderItem ? renderItem(filter) : filter.label}</span>
                {filter.count !== 0 && (
                    <Badge variant="secondary" className="ml-2">
                        {filter.exhaustive ? filter.count : `${roundCount(filter.count)}+`}
                    </Badge>
                )}
                {selected && <Icon svgPath={mdiClose} aria-hidden={true} className="ml-1 flex-shrink-0" />}
            </Button>
        </li>
    )
}

function roundCount(count: number): number {
    const roundNumbers = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1]
    for (const roundNumber of roundNumbers) {
        if (count >= roundNumber) {
            return roundNumber
        }
    }
    return 0
}

function filtersEqual(a: URLQueryFilter, b: URLQueryFilter): boolean {
    return a.kind === b.kind && a.label === b.label && a.value === b.value
}

export const languageFilter = (filter: Filter): ReactNode => (
    <>
        <LanguageIcon language={filter.label} className={styles.icon} />
        {filter.label}
    </>
)

export const repoFilter = (filter: Filter): ReactNode => {
    const { svgPath } = codeHostIcon(filter.label)

    return (
        <Tooltip content={filter.label}>
            <span>
                <Icon aria-hidden={true} svgPath={svgPath ?? mdiSourceRepository} /> {displayRepoName(filter.label)}
            </span>
        </Tooltip>
    )
}

export const commitDateFilter = (filter: Filter): ReactNode => (
    <span className={styles.commitDate}>
        {filter.label}
        <Code>{filter.value}</Code>
    </span>
)

export const symbolFilter = (filter: Filter): ReactNode => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const symbolKindTags = useExperimentalFeatures(features => features.symbolKindTags)

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const symbolType = useMemo(() => {
        const parts = filter.value.split('.')
        return parts.at(-1) ?? ''
    }, [filter])

    return (
        <>
            <SymbolKind
                kind={symbolType.toUpperCase() as any}
                className={styles.icon}
                symbolKindTags={symbolKindTags}
            />
            {filter.label}
        </>
    )
}

export const utilityFilter = (filter: Filter): string => (filter.count === 0 ? filter.value : filter.label)

export const authorFilter = (filter: Filter): ReactNode => (
    <>
        <UserAvatar size={14} user={{ avatarURL: null, displayName: filter.label }} className={styles.avatar} />
        {filter.label}
    </>
)
