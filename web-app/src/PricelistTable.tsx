import { useState, useEffect } from 'react';
import { DateTimeUtils } from 'smart-power-consumer-api';
import { CurrencyUtils } from './CurrencyUtils';
import { PricelistItem } from "smart-power-consumer-api";
import { ErrorComponent } from './ErrorComponent';



export const PriceListTable = () => {
  const [today] = useState<number>(DateTimeUtils.cutOffTime(Date.now()));
  const [date, setDate] = useState<number>(DateTimeUtils.cutOffTime(Date.now()));
  const [pricelist, setPricelist] = useState<PricelistItem[]>([]);
  const [filteredPricelist, setFilteredPricelist] = useState<PricelistItem[]>([]);
  const [fetchingError, setFetchingError] = useState<string[]>(null);
  const [hidePastItems, setHidePastItems] = useState<boolean>(false);

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
    setHidePastItems(today === date);
  }, [date]);

  const filterPricelistItem = (pricelistItem: PricelistItem) => today === date && hidePastItems ? (pricelistItem.startsAt + pricelistItem.duration) > Date.now() : true

  const renderHidePastItems = () => {
    if (today === date) {
    return ( 
      <tr>
        <th colSpan={2}>
          <label htmlFor="hidePastItems">Hide past items: </label>
          <input id="hidePastItems" type="checkbox" checked={hidePastItems} onChange={ (event) => setHidePastItems(event.target.checked) }/>
        </th>
      </tr>
    )
    }
    return null;
  }

   useEffect(() => {
    setFilteredPricelist(pricelist.filter(filterPricelistItem));
   }, [pricelist, hidePastItems, date]);

  return (
    <div>
        <div>
          <label htmlFor="date">Select price list date: </label>
          <input id="date" type='date' value={DateTimeUtils.formatDateForInput(date)} onChange={ (e) => setDate(DateTimeUtils.cutOffTime(new Date(e.target.value).getTime()))}/>
        </div>
        {fetchingError != null ? <ErrorComponent message={fetchingError}/>:
          (
            <table className="pricelistTable">
              <thead>
                <tr>
                  <th colSpan={2}>Price list for {date === today ? "today" : (date < today ? "the past" : "the future")}: {DateTimeUtils.formatDate(date)}</th>
                </tr>
                {renderHidePastItems()}
                <tr>
                    <th>Hour</th>
                    <th>Price [PLN/kWh]</th>
                </tr>
              </thead>
                <tbody>
                  {filteredPricelist.map((pricelistItem: PricelistItem) => (
                      <tr key={pricelistItem.startsAt}>
                          <td>{DateTimeUtils.getTime(pricelistItem.startsAt)}</td>
                          <td className={`price-${pricelistItem.category}`}>{CurrencyUtils.format(pricelistItem.price)}</td>
                      </tr>
                  ))}
                </tbody>
        
            </table>
          )
        }
    </div>
  );
};