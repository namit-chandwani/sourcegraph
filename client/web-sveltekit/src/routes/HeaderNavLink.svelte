<script lang="ts">
    import { page } from '$app/stores'
    import Icon from '$lib/Icon.svelte'

    export let href: string
    export let svgIconPath: string = ''
    export let external = false

    $: current = $page.url.pathname === href ? ('page' as const) : null
</script>

<li aria-current={current}>
    <a {href} data-sveltekit-reload={external || 'off'}>
        {#if $$slots.icon}
            <span class="icon"><slot name="icon" /></span>
            &nbsp;
        {:else if svgIconPath}
            <Icon svgPath={svgIconPath} aria-hidden="true" inline />
            &nbsp;
        {/if}
        <span><slot /></span>
    </a>
</li>

<style lang="scss">
    li {
        --color: var(--header-icon-color);

        position: relative;
        display: flex;
        align-items: stretch;
        border-bottom: 2px solid transparent;
        margin: 0 0.5rem;
        white-space: nowrap;

        &:hover {
            border-color: var(--border-color-2);
        }

        &[aria-current='page'] {
            border-color: var(--brand-secondary);
        }
    }

    .icon {
        width: var(--icon-inline-size);
        height: var(--icon-inline-size);
        color: var(--header-icon-color);
        display: flex;
        align-items: center;
    }

    a {
        display: flex;
        height: 100%;
        align-items: center;
        text-decoration: none;

        &:hover {
            text-decoration: none;
        }
    }

    span,
    a {
        color: var(--body-color);
    }
</style>
