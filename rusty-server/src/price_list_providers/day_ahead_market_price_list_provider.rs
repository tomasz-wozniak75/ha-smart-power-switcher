use crate::model::{AppError, Currency, PriceCategory, PriceListItem};
use chrono::{DateTime, Local, TimeDelta, Utc};
use moka::sync::Cache;
use regex::Regex;
use scraper::{Html, Selector};
use std::{num::ParseFloatError, sync::Arc};

use super::{commons::cut_off_time_from_date, parse_date, SingleDayPriceList};

///  DayAheadMarketPriceListProvider scrapes price list from the day ahead market web page, using scraper crate
/// and it stores price list in the moka cache to reduce external calls and speed application
///
/// Price list for tomorrow is published at 2 pm today, so request for price list before 2 pm for tomorrow will fail
/// Page is able to return price lists for two months back
pub struct DayAheadMarketPriceListProvider {
    cache: Cache<DateTime<Utc>, Arc<Vec<PriceListItem>>>,
}

impl DayAheadMarketPriceListProvider {
    pub fn new() -> Self {
        Self { cache: Cache::new(30) }
    }

    fn get_day_ahead_market_url(requested_date: DateTime<Utc>) -> String {
        let day_before = requested_date.with_timezone(&Local) - TimeDelta::days(1);
        format!("https://tge.pl/energia-elektryczna-rdn?dateShow={}&dateAction=prev", day_before.format("%d-%m-%Y"))
    }

    /// Function fetch day ahead market page content as text, it needs to use curl library
    /// as web server of day ahead market page incorrectly handles headers,
    /// it requires them in capital letters but http standard puts them in lower case and reqwest
    /// implements headers in the recommended way
    fn fetch_price_list_text(url: String) -> Result<String, AppError> {
        use curl::easy::Easy;
        use curl::easy::List;

        let mut list = List::new();
        list.append("User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36").unwrap();
        list.append("Accept-Language: en-GB,en-US;q=0.9,en;q=0.8,pl;q=0.7").unwrap();

        let mut text: String = String::new();
        {
            let mut easy = Easy::new();
            let _ = easy
                .url(&url)
                .and_then(|_| easy.http_headers(list))
                .and_then(|_| {
                    let mut transfer = easy.transfer();
                    let _ = transfer.write_function(|data| {
                        String::from_utf8(Vec::from(data)).map(|new_text| text.push_str(&new_text)).unwrap();
                        Ok(data.len())
                    });
                    transfer.perform()
                })
                .map_err(|e| AppError::system_error(&format!("{:?}", e)));
        }
        Ok(text)
    }

    //function scapes price list publish date to validate if tis equal to required date,
    /// if price list is missing for tomorrow, page returns today price list
    fn parse_publish_date(html: &Html) -> Result<DateTime<Utc>, AppError> {
        let re = Regex::new(r"\d{2}-\d{2}-\d{4}").unwrap(); //input is constant, save to  unwrap
        let date_is_missing = || AppError::system_error("Price list date is missing on day ahead market page!");

        Selector::parse(".kontrakt-date small")
            .map_err(|_| date_is_missing())
            .and_then(|selector| {
                html.select(&selector)
                    .next()
                    .map(|contract_date_ref| contract_date_ref.text().collect::<Vec<_>>().join(""))
                    .and_then(|contract_date_text| {
                        re.captures(&contract_date_text).map(|captures| captures[0].to_owned())
                    })
                    .ok_or_else(date_is_missing)
            })
            .and_then(parse_date)
    }

    /// Function scrapes price from the price list html table
    fn parse_price_list_table(html: &Html) -> Result<Vec<Currency>, AppError> {
        let price_list_table_is_missing =
            || AppError::system_error("Price list table is missing on day ahead market page!");
        let selector = "#footable_kontrakty_godzinowe tbody tr td:nth-child(2)";

        Selector::parse(selector).map_err(|_| price_list_table_is_missing()).and_then(|selector| {
            let result_list = html
                .select(&selector)
                .filter_map(|row| row.first_child().and_then(|td| td.value().as_text().map(|t| t.to_string())))
                .map(|s| s.trim().to_owned())
                .map(|s| s.replace(",", "."))
                .map(|s| s.parse::<f32>())
                .collect::<Vec<Result<f32, ParseFloatError>>>();

            if result_list.iter().any(|i| i.is_err()) {
                Err(AppError::system_error("Price list table has unparsable numbers!"))
            } else {
                Ok(result_list.into_iter().map(|f| (f.unwrap() * 100.0) as Currency).collect::<Vec<Currency>>())
            }
        })
    }

    /// function validates if requested date is the same as price list publish date
    fn validate_price_list_date(
        requested_date: DateTime<Utc>,
        publish_date: Result<DateTime<Utc>, AppError>,
    ) -> Result<(), AppError> {
        if publish_date.is_err() || publish_date.unwrap() != requested_date {
            let today = cut_off_time_from_date(&Local::now().with_timezone(&Utc));
            let msg_postfix = if requested_date > today {
                ", for tomorrow price list is published at 2pm!"
            } else {
                ", price lists are published for last 2 months!"
            };

            let requested_date = requested_date.with_timezone(&Local).format("%d-%m-%Y");

            return Err(AppError::not_found(&format!(
                "Missing price list for date: {}{}",
                requested_date, msg_postfix
            )));
        }
        Ok(())
    }

    /// Function converts list of 24 prices into price list items which covers entire day
    fn convert_to_price_list_items(requested_date: &DateTime<Utc>, prices: Vec<Currency>) -> Vec<PriceListItem> {
        use PriceCategory::*;
        let minimal_price = 500;
        let transfer_cost = 9000;
        let price_category_min_threshold = 20000;
        let price_category_max_threshold = 80000;

        let reevaluate_price = |price| (if (price) < 5 { minimal_price } else { price }) + transfer_cost;
        let evaluate_price_category = |price| {
            if price < price_category_min_threshold {
                Min
            } else if price > price_category_max_threshold {
                Max
            } else {
                Medium
            }
        };

        prices
            .into_iter()
            .enumerate()
            .map(|(i, price)| {
                let price = reevaluate_price(price);
                let category = evaluate_price_category(price);

                PriceListItem::new(*requested_date + TimeDelta::hours(i as i64), TimeDelta::hours(1), price, category)
            })
            .collect()
    }

    ///scraping logic
    fn parse_price_list(requested_date: DateTime<Utc>) -> Result<Vec<PriceListItem>, AppError> {
        let url = Self::get_day_ahead_market_url(requested_date);
        let text = Self::fetch_price_list_text(url)?;

        let html = Html::parse_document(&text);
        let publish_date = Self::parse_publish_date(&html);
        Self::validate_price_list_date(requested_date, publish_date)?;

        Ok(Self::convert_to_price_list_items(&requested_date, Self::parse_price_list_table(&html)?))
    }
}

impl Default for DayAheadMarketPriceListProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl SingleDayPriceList for DayAheadMarketPriceListProvider {
    /// Returns price list from the  cache if it is missing scapes web page for price list
    /// Moka cache keeps last 30 entries
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Result<Arc<Vec<PriceListItem>>, AppError> {
        let for_day = cut_off_time_from_date(for_day);

        if !self.cache.contains_key(&for_day) {
            let price_list = Self::parse_price_list(for_day)?;
            self.cache.insert(for_day, Arc::new(price_list));
        }

        self.cache
            .get(&for_day)
            .ok_or(AppError::not_found(&format!("Price list for date {} is missing", for_day.format("%d-%m-%Y"))))
    }
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Local, TimeZone, Utc};

    use crate::{
        model::AppError,
        price_list_providers::{commons::cut_off_time_from_date, DayAheadMarketPriceListProvider},
    };
    use scraper::Html;

    fn date(year: i32, month: u32, day: u32) -> DateTime<Utc> {
        Local.with_ymd_and_hms(year, month, day, 0u32, 0u32, 0u32).map(|dt| dt.with_timezone(&Utc)).unwrap()
    }

    #[test]
    fn check_get_day_ahead_market_url() {
        let expected_url = DayAheadMarketPriceListProvider::get_day_ahead_market_url(date(2024, 1, 1));
        assert_eq!(expected_url, "https://tge.pl/energia-elektryczna-rdn?dateShow=31-12-2023&dateAction=prev");

        let expected_url = DayAheadMarketPriceListProvider::get_day_ahead_market_url(date(2024, 1, 2));
        assert_eq!(expected_url, "https://tge.pl/energia-elektryczna-rdn?dateShow=01-01-2024&dateAction=prev");

        let expected_url = DayAheadMarketPriceListProvider::get_day_ahead_market_url(date(2024, 9, 11));
        assert_eq!(expected_url, "https://tge.pl/energia-elektryczna-rdn?dateShow=10-09-2024&dateAction=prev");
    }

    #[test]
    fn parse_publish_date_should_find_date() {
        let html = r#"<body class="kontrakt-date"> <small>for a day 03-02-2025</small> </body>"#;
        let document = Html::parse_document(html);
        let found_date =
            DayAheadMarketPriceListProvider::parse_publish_date(&document).expect("Date should be returned");
        assert_eq!(found_date, date(2025, 2, 3));
    }

    #[test]
    fn parse_publish_date_should_should_report_error_if_date_is_missing() {
        let html = r#"<body class="kontrakt-date"> <small>for a day HERE missing date</small> </body>"#;
        let document = Html::parse_document(html);
        match DayAheadMarketPriceListProvider::parse_publish_date(&document) {
            Ok(_) => panic!("Parse_contract_date should return error"),
            Err(app_error) => match app_error {
                AppError::UserError { message: _, code: _ } => panic!("Parse_contract_date should return system error"),
                AppError::SystemError { message, code: _ } => {
                    assert_eq!(message, "Price list date is missing on day ahead market page!")
                }
            },
        };
    }

    #[test]
    fn parse_price_list_table() {
        let html = r#"<body> 
                                <table id="footable_kontrakty_godzinowe">
                                    <tbody>
                                        <tr>
                                            <td>skip 1</td>
                                            <td>123,00</td>
                                        </tr>
                                        <tr>
                                            <td>skip 2</td>
                                            <td>111,00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </body>"#;
        let document = Html::parse_document(html);

        let result = DayAheadMarketPriceListProvider::parse_price_list_table(&document).unwrap();
        assert_eq!(result, vec![12300, 11100]);
    }

    #[test]
    fn check_price_list_fetching() {
        let price_list =
            DayAheadMarketPriceListProvider::parse_price_list(cut_off_time_from_date(&Utc::now())).unwrap();
        assert_eq!(price_list.len(), 24)
    }
}
