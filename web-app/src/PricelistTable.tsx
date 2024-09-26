import { useState, useEffect } from 'react';
import { DateTimeUtils } from 'smart-power-consumer-api';
import { CurrencyUtils } from './CurrencyUtils';
import { PricelistItem } from "smart-power-consumer-api";

export const PriceListTable = () => {
  const [date, setDate] = useState(Date.now());
  const [pricelist, setPricelist] = useState<PricelistItem[]>([]);
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
        <table className="pricelistTable">
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
              {pricelist.map((pricelistItem: PricelistItem) => (
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