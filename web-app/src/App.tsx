import React from 'react';
import './App.css';
import { PriceListTable } from './PricelistTable';
import { PowerConsumersList } from './PowerConsumersList';


export function App() {
  return (
    <div className="App">
      <PriceListTable></PriceListTable>
      <PowerConsumersList></PowerConsumersList>
    </div>
  );
}