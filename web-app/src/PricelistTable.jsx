import { useState, useEffect } from 'react';
import { DateTimeUtils } from './DateTimeUtils';
import { CurrencyUtils } from './CurrencyUtils';

const PriceListTable = () => {
  const [date] = useState(Date.now());
  const [pricelist, setPricelist] = useState([]);
  useEffect(() => {
    fetch(`/pricelist/${DateTimeUtils.formatDate(date)}`)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
         setPricelist(data);
      });
  }, []);
  return (
    <div>
        <table class="pricelistTable">
          <thead>
            <tr>
              <th>Price list {DateTimeUtils.formatDate(date)}</th>
              <th></th>
            </tr>
            <tr>
                <th>Hour</th>
                <th>Price [PLN/kWh]</th>
            </tr>
          </thead>
            <tbody>
              {pricelist.map((pricelistItem) => (
                  <tr>
                      <td>{DateTimeUtils.getTime(pricelistItem.startsAt)}</td>
                      <td>{CurrencyUtils.format(pricelistItem.price)}</td>
                  </tr>
              ))}
            </tbody>
    
        </table>
    </div>
  );
};
export default PriceListTable;