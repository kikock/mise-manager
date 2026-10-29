use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorCode {
    MiseNotFound,
    CommandFailed,
    CommandTimeout,
    ValidationFailed,
    ConfigError,
    IoError,
    InternalError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    pub suggestion: Option<String>,
}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            suggestion: None,
        }
    }

    pub fn with_suggestion(mut self, suggestion: impl Into<String>) -> Self {
        self.suggestion = Some(suggestion.into());
        self
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::MiseNotFound, message)
    }

    pub fn process(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::CommandFailed, message)
    }

    pub fn config(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::ConfigError, message)
    }

    pub fn io(err: std::io::Error) -> Self {
        Self::new(ErrorCode::IoError, err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        Self::io(err)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}: {}", self.code, self.message)
    }
}

impl std::error::Error for AppError {}

pub type AppResult<T> = Result<T, AppError>;
