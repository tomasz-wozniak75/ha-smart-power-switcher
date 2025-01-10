import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ChargingStatusComponent } from './ChargingStatusComponent';


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ChargingStatusComponent />
  </React.StrictMode>
);

