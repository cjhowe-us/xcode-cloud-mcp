/**
 * Type definitions for App Store Connect API responses
 */

export interface CiProduct {
  type: 'ciProducts';
  id: string;
  attributes: {
    name: string;
    createdDate: string;
    productType: string;
  };
  relationships?: {
    primaryRepositories?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

export interface CiWorkflow {
  type: 'ciWorkflows';
  id: string;
  attributes: {
    name: string;
    description?: string;
    isEnabled: boolean;
    isLockedForEditing: boolean;
    clean: boolean;
    containerFilePath: string;
    lastModifiedDate: string;
  };
  relationships?: {
    product?: {
      data: { type: string; id: string };
    };
    repository?: {
      data: { type: string; id: string };
    };
  };
}

export interface CiBuildRun {
  type: 'ciBuildRuns';
  id: string;
  attributes: {
    number: number;
    createdDate: string;
    startedDate?: string;
    finishedDate?: string;
    sourceCommit?: {
      commitSha: string;
      message?: string;
      author?: {
        displayName: string;
        avatarUrl?: string;
      };
    };
    destinationCommit?: {
      commitSha: string;
      message?: string;
    };
    isPullRequestBuild: boolean;
    issueCounts?: {
      analyzerWarnings: number;
      errors: number;
      testFailures: number;
      warnings: number;
    };
    executionProgress: 'PENDING' | 'RUNNING' | 'COMPLETE';
    completionStatus?: 'SUCCEEDED' | 'FAILED' | 'ERRORED' | 'CANCELED';
    startReason?:
      | 'GIT_REF_CHANGE'
      | 'MANUAL'
      | 'PULL_REQUEST_UPDATE'
      | 'SCHEDULE'
      | 'CI_WORKFLOW_UPDATE';
  };
  relationships?: {
    workflow?: {
      data: { type: string; id: string };
    };
    actions?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

export interface CiBuildAction {
  type: 'ciBuildActions';
  id: string;
  attributes: {
    name: string;
    actionType: 'BUILD' | 'TEST' | 'ANALYZE' | 'ARCHIVE';
    startedDate?: string;
    finishedDate?: string;
    issueCounts?: {
      analyzerWarnings: number;
      errors: number;
      testFailures: number;
      warnings: number;
    };
    executionProgress: 'PENDING' | 'RUNNING' | 'COMPLETE';
    completionStatus?:
      | 'SUCCEEDED'
      | 'FAILED'
      | 'ERRORED'
      | 'CANCELED'
      | 'SKIPPED';
  };
  relationships?: {
    buildRun?: {
      data: { type: string; id: string };
    };
  };
}

export interface CiIssue {
  type: 'ciIssues';
  id: string;
  attributes: {
    issueType: 'ANALYZER_WARNING' | 'ERROR' | 'TEST_FAILURE' | 'WARNING';
    message: string;
    fileSource?: {
      path: string;
      lineNumber?: number;
    };
    category?: string;
  };
}

export interface CiTestResult {
  type: 'ciTestResults';
  id: string;
  attributes: {
    className: string;
    name: string;
    status: 'SUCCESS' | 'FAILURE' | 'EXPECTED_FAILURE' | 'SKIPPED' | 'MIXED';
    fileSource?: {
      path: string;
      lineNumber?: number;
    };
    message?: string;
    duration?: number;
  };
  relationships?: {
    attachments?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

export interface CiArtifact {
  type: 'ciArtifacts';
  id: string;
  attributes: {
    fileName: string;
    fileType:
      | 'LOG'
      | 'ARCHIVE'
      | 'XCODEBUILD_ARCHIVE'
      | 'RESULT_BUNDLE'
      | 'TEST_PRODUCTS'
      | 'SCREENSHOT'
      | 'VIDEO';
    fileSize?: number;
    downloadUrl?: string;
  };
}

export interface ScmGitReference {
  type: 'scmGitReferences';
  id: string;
  attributes: {
    name: string;
    canonicalName: string;
    isDeleted: boolean;
    kind: 'BRANCH' | 'TAG';
  };
}

/**
 * Request body for starting a build run
 */
export interface StartBuildRunRequest {
  data: {
    type: 'ciBuildRuns';
    relationships: {
      workflow: {
        data: {
          type: 'ciWorkflows';
          id: string;
        };
      };
      sourceBranchOrTag?: {
        data: {
          type: 'scmGitReferences';
          id: string;
        };
      };
    };
  };
}

/**
 * Parameters needed to create a new workflow
 */
export interface CreateWorkflowParams {
  name: string;
  description?: string;
  isEnabled?: boolean;
  clean?: boolean;
  containerFilePath: string;
  repositoryId?: string;
  gitReferenceId?: string;
}

/**
 * Request body for creating a workflow
 */
export interface CreateWorkflowRequest {
  data: {
    type: 'ciWorkflows';
    attributes: {
      name: string;
      description?: string;
      isEnabled: boolean;
      clean: boolean;
      containerFilePath: string;
    };
    relationships: {
      product: {
        data: {
          type: 'ciProducts';
          id: string;
        };
      };
      repository?: {
        data: {
          type: 'scmRepositories';
          id: string;
        };
      };
      sourceBranchOrTag?: {
        data: {
          type: 'scmGitReferences';
          id: string;
        };
      };
    };
  };
}
