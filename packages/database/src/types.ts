type DatabaseJoins = {
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type DatabaseLogMetadataSuccess = {
  model: string;
  operation: string;
  joins?: DatabaseJoins;
  resultCount: number;
  timestamp: string;
  path: string;
};

type DatabaseLogMetadataError = {
  model: string;
  operation: string;
  joins?: DatabaseJoins;
  error: string;
  timestamp: string;
  path: string;
};

export type DatabaseLogMetadata = DatabaseLogMetadataSuccess | DatabaseLogMetadataError;
