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

export interface CiXcodeVersion {
  type: 'ciXcodeVersions';
  id: string;
  attributes: {
    version: string;
    name: string;
    testDestinations?: CiTestDestination[];
  };
  relationships?: {
    macOsVersions?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

export interface CiMacOsVersion {
  type: 'ciMacOsVersions';
  id: string;
  attributes: {
    version: string;
    name: string;
  };
  relationships?: {
    xcodeVersions?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

export interface CiTestDestinationRuntime {
  runtimeName: string;
  runtimeIdentifier: string;
}

export interface CiTestDestination {
  deviceTypeName?: string;
  deviceTypeIdentifier?: string;
  runtimeName?: string;
  runtimeIdentifier?: string;
  availableRuntimes?: CiTestDestinationRuntime[];
  kind?: 'SIMULATOR' | 'MAC';
}

export type CiActionType = 'BUILD' | 'ANALYZE' | 'TEST' | 'ARCHIVE';

export type CiPlatform = 'MACOS' | 'IOS' | 'TVOS' | 'WATCHOS' | 'VISIONOS';

export type CiDestination =
  | 'ANY_IOS_DEVICE'
  | 'ANY_IOS_SIMULATOR'
  | 'ANY_TVOS_DEVICE'
  | 'ANY_TVOS_SIMULATOR'
  | 'ANY_WATCHOS_DEVICE'
  | 'ANY_WATCHOS_SIMULATOR'
  | 'ANY_MAC'
  | 'ANY_MAC_CATALYST'
  | 'ANY_VISIONOS_DEVICE'
  | 'ANY_VISIONOS_SIMULATOR';

export interface CiAction {
  name: string;
  actionType: CiActionType;
  destination?: CiDestination;
  platform?: CiPlatform;
  scheme?: string;
  isRequiredToPass?: boolean;
  testConfig?: {
    kind?: 'USE_SCHEME_SETTINGS' | 'SPECIFIC_TEST_PLANS';
    testPlanName?: string;
    testDestinations?: CiTestDestination[];
  };
  buildDistributionAudience?: 'INTERNAL_ONLY' | 'APP_STORE_ELIGIBLE';
}

export interface CiBranchPatterns {
  isAllMatch?: boolean;
  patterns?: Array<{
    pattern: string;
    isPrefix?: boolean;
  }>;
}

export interface CiBranchStartCondition {
  source?: CiBranchPatterns;
  filesAndFoldersRule?: {
    mode?: 'START_IF_ANY_FILE_MATCHES' | 'DO_NOT_START_IF_ALL_FILES_MATCH';
    matchers?: Array<{
      directory?: string;
      fileExtension?: string;
      fileName?: string;
    }>;
  };
  autoCancel?: boolean;
}

export interface CiManualBranchStartCondition {
  source?: CiBranchPatterns;
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
  description: string;
  isEnabled?: boolean;
  clean?: boolean;
  containerFilePath: string;
  repositoryId: string;
  xcodeVersionId: string;
  macOsVersionId: string;
  actions: CiAction[];
  branchStartCondition?: CiBranchStartCondition;
  manualBranchStartCondition?: CiManualBranchStartCondition;
}

/**
 * Parameters needed to update an existing workflow
 */
export interface UpdateWorkflowParams {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  clean?: boolean;
  containerFilePath?: string;
  actions?: CiAction[];
  branchStartCondition?: CiBranchStartCondition | null;
  manualBranchStartCondition?: CiManualBranchStartCondition | null;
  xcodeVersionId?: string;
  macOsVersionId?: string;
}

/**
 * Request body for creating a workflow
 */
export interface CreateWorkflowRequest {
  data: {
    type: 'ciWorkflows';
    attributes: {
      name: string;
      description: string;
      isEnabled: boolean;
      clean: boolean;
      containerFilePath: string;
      actions: CiAction[];
      branchStartCondition?: CiBranchStartCondition | null;
      manualBranchStartCondition?: CiManualBranchStartCondition | null;
    };
    relationships: {
      product: {
        data: {
          type: 'ciProducts';
          id: string;
        };
      };
      repository: {
        data: {
          type: 'scmRepositories';
          id: string;
        };
      };
      xcodeVersion: {
        data: {
          type: 'ciXcodeVersions';
          id: string;
        };
      };
      macOsVersion: {
        data: {
          type: 'ciMacOsVersions';
          id: string;
        };
      };
    };
  };
}

/**
 * Request body for updating a workflow
 */
export interface UpdateWorkflowRequest {
  data: {
    type: 'ciWorkflows';
    id: string;
    attributes?: {
      name?: string;
      description?: string;
      isEnabled?: boolean;
      clean?: boolean;
      containerFilePath?: string;
      actions?: CiAction[];
      branchStartCondition?: CiBranchStartCondition | null;
      manualBranchStartCondition?: CiManualBranchStartCondition | null;
    };
    relationships?: {
      xcodeVersion?: {
        data: {
          type: 'ciXcodeVersions';
          id: string;
        };
      };
      macOsVersion?: {
        data: {
          type: 'ciMacOsVersions';
          id: string;
        };
      };
    };
  };
}
