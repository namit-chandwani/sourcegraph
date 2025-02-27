package ci

import (
	bk "github.com/sourcegraph/sourcegraph/dev/ci/internal/buildkite"
	"github.com/sourcegraph/sourcegraph/dev/ci/internal/ci/operations"
)

func BazelOperations(buildOpts bk.BuildOptions, opts CoreTestOperationsOptions) []operations.Operation {
	ops := []operations.Operation{bazelPrechecks()}
	if !opts.AspectWorkflows {
		if opts.IsMainBranch {
			ops = append(ops, bazelTest("//...", "//client/web:test", "//testing:codeintel_integration_test", "//testing:backend_integration_test"))
		} else {
			ops = append(ops, bazelTest("//...", "//client/web:test"))
		}
	}

	ops = append(ops, triggerBackCompatTest(buildOpts, opts.AspectWorkflows), bazelGoModTidy())
	return ops
}
