use chrono::TimeDelta;
use serde::de::{Deserialize, Deserializer};
use serde::Serializer;
use uuid::Uuid;

pub fn serialize_time_delta<S>(time_delta: &TimeDelta, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_i64(time_delta.num_milliseconds())
}

pub fn serialize_time_delta_as_mins<S>(time_delta: &TimeDelta, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_i64(time_delta.num_minutes())
}

pub fn deserialize_time_delta<'de, D>(deserializer: D) -> Result<TimeDelta, D::Error>
where
    D: Deserializer<'de>,
{
    i64::deserialize(deserializer).map(TimeDelta::milliseconds)
}

pub fn serialize_uuid<S>(uuid_value: &Uuid, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&uuid_value.as_hyphenated().to_string())
}
