import { useState, useEffect } from 'react';
import { DateTimeUtils } from 'smart-power-consumer-api';
import { CurrencyUtils } from './CurrencyUtils';
import { PricelistItem } from "smart-power-consumer-api";



export const PriceListTable = () => {
  const [currentDate] = useState<number>(DateTimeUtils.cutOffTime(Date.now()));
  const [date, setDate] = useState<number>(DateTimeUtils.cutOffTime(Date.now()));
  const [pricelist, setPricelist] = useState<PricelistItem[]>([]);
  const [fetchingError, setFetchingError] = useState<string[]>(null);

  useEffect(() => {
    const fetchPriceList = async () => {
        const response = await fetch(`/pricelist/${DateTimeUtils.formatDate(date)}`)
        const responseJSON = await response.json();
        if (response.ok) {
          return responseJSON;
        } else {
          throw new Error(responseJSON.message)
        }
    };

  fetchPriceList()
      .then((response) => {setFetchingError(null); setPricelist(response); } )
      .catch((error) => {setFetchingError(error.message);});

  }, [date]);

  return (
    <div>
        <div>
          <label htmlFor="date">Select price list date: </label>
          <input id="date" type='date' value={DateTimeUtils.formatDateForInput(date)} onChange={ (e) => setDate(new Date(e.target.value).getTime())}/>
        </div>
        {fetchingError != null ? <div className='errorMessage'>{fetchingError}</div>:
          (
            <table className="pricelistTable">
              <thead>
                <tr>
                  <th>Price list for {date == currentDate ? "today" : (date < currentDate ? "the past" : "the future")}: {DateTimeUtils.formatDate(date)}</th>
                  <th></th>
                </tr>
                <tr>
                    <th>Hour</th>
                    <th>Price [PLN/kWh]</th>
                </tr>
              </thead>
                <tbody>
                  {pricelist.map((pricelistItem: PricelistItem) => (
                      <tr key={pricelistItem.startsAt}>
                          <td>{DateTimeUtils.getTime(pricelistItem.startsAt)}</td>
                          <td>{CurrencyUtils.format(pricelistItem.price)}</td>
                      </tr>
                  ))}
                </tbody>
        
            </table>
          )
        }
    </div>
  );
};