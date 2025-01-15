
mod model;

use axum::{
    extract::Path,
    response::Json,
};

#[derive(serde::Serialize)]
pub struct User {
    id: u32
} 

pub async fn hello_user(Path(user_id): Path<u32>) -> Json<User> {
        Json(User{ id: user_id })
}