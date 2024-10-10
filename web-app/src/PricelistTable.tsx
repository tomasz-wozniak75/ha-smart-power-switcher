import { useState, useEffect } from 'react';
import { DateTimeUtils } from 'smart-power-consumer-api';
import { CurrencyUtils } from './CurrencyUtils';
import { PricelistItem } from "smart-power-consumer-api";
import { ErrorComponent } from './ErrorComponent';



export const PriceListTable = () => {
  const [today, setToday] = useState<number>(DateTimeUtils.cutOffTime(Date.now()));
  const [date, setDate] = useState<number>(DateTimeUtils.cutOffTime(Date.now()));
  const [pricelist, setPricelist] = useState<PricelistItem[]>([]);
  const [filteredPricelist, setFilteredPricelist] = useState<PricelistItem[]>([]);
  const [fetchingError, setFetchingError] = useState<string[]>(null);
  const [hidePastItems, setHidePastItems] = useState<boolean>(false);
  const [sortedByTime, setSortedByTime] = useState<boolean>(true);
  const [isLoading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const fetchPriceList = async () => {
        setLoading(true);
        const response = await fetch(`/pricelist/${DateTimeUtils.formatDate(date)}`)
        const responseJSON = await response.json();
        setLoading(false);
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
    setSortedByTime(true);
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


  const sortPricelistByPrice = (pricelist: PricelistItem[]): PricelistItem[] =>  {
    return [...pricelist].sort((a, b) => {
                if (a.price < b.price) return -1;
                if (a.price > b.price) return 1;
                if (a.startsAt < b.startsAt) return -1;
                if (a.startsAt > b.startsAt) return 1;
                return 0;
    });        
  }

  const handleSortPricelistByPrice = (event: React.MouseEvent<HTMLElement>) => {
    setPricelist(sortPricelistByPrice(pricelist))
    setSortedByTime(false);
  };

  const handleSortPricelistByTime = (event: React.MouseEvent<HTMLElement>) => {
    setPricelist([...pricelist].sort((a, b) => a.startsAt - b.startsAt));
    setSortedByTime(true);
  };

  const setTodayAction = () => {
    setToday(DateTimeUtils.cutOffTime(Date.now()));
    setDate(today);
  }

  const renderPricelisttable = () => {
    if (isLoading) {
      return <div className="spinner"></div>
    }
    return (fetchingError != null ? <ErrorComponent message={fetchingError}/>:
      (
        <table className="pricelistTable">
          <thead>
            <tr>
              <th colSpan={2}>Price list for {date === today ? "today" : (date < today ? "the past" : "the future")}: {DateTimeUtils.formatDate(date)}</th>
            </tr>
            {renderHidePastItems()}
            <tr>
                <th><a href="#Foo" onClick={handleSortPricelistByTime}>Hour{sortedByTime? " ↓": null}</a></th>
                <th><a href="#Foo" onClick={handleSortPricelistByPrice}>Price [PLN/kWh]{sortedByTime? null : " ↓"}</a></th>
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
    )
  }

  return (
    <div>
        <header>Price list</header>
        <div className='inputBlock'>
          <label htmlFor="date">Select price list date: </label>
          <input id="date" type='date' value={DateTimeUtils.formatDateForInput(date)} onChange={ (e) => setDate(DateTimeUtils.cutOffTime(new Date(e.target.value).getTime()))}/>
          <div>
              <input name="button-decrease-date" type='button' value={"<< day"}  onClick={(e) => setDate(DateTimeUtils.addDays(date, -1))}/>                    
              <input name="button-now" type='button' value={"Today"}  onClick={(e) => setTodayAction()} disabled={date === today} />                    
              <input name="button-increase-date" type='button' value={"day >>"}  onClick={(e) => setDate(DateTimeUtils.addDays(date, 1))}/> 
          </div>
        </div>
        {renderPricelisttable()}
    </div>
  );
};