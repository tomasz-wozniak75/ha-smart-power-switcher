use std::error::Error;

use axum::http::StatusCode;

#[derive(serde::Serialize, Debug)]
#[serde(untagged)]
pub enum AppError {
    UserError {
        message: String,
        #[serde(skip_serializing)]
        code: StatusCode,
    },
    SystemError {
        message: String,
        #[serde(skip_serializing)]
        code: StatusCode,
    },
}

impl AppError {
    pub fn user_error(message: &str) -> Self {
        Self::UserError { message: message.to_owned(), code: StatusCode::BAD_REQUEST }
    }

    pub fn not_found(message: &str) -> Self {
        Self::UserError { message: message.to_owned(), code: StatusCode::NOT_FOUND }
    }

    pub fn system_error(message: &str) -> Self {
        Self::SystemError { message: message.to_owned(), code: StatusCode::INTERNAL_SERVER_ERROR }
    }

    pub fn code(&self) -> StatusCode {
        match self {
            AppError::UserError { message: _, code } => *code,
            AppError::SystemError { message: _, code } => *code,
        }
    }
}

impl Error for AppError {}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::UserError { message, code: _ } => write!(f, "[UserError] {}", message),
            AppError::SystemError { message, code: _ } => write!(f, "[SystemError] {}", message),
        }
    }
}
