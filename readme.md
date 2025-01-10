# Smart energy home automation

## Purpose
In Poland, there is an electricity tariff in which prices are changing on an hourly basis due to actual power supply and consumption. 
Consumers could benefit from low prices during nights or when there is a strong wind or sunny day that causes energy over production.

This project is intended to charge car batteries in the hours when it is profitable. Charging is controlled by [Tuya smart swithes](https://www.tuya.com/)
but Tuya application has only simple automation not sufficient for this task. Tuya exposes REST API but is not free of charge, 
fortunately Tuya could be integrated with [Home Assistant](https://www.home-assistant.io/) application which 
has free REST API which could be used by smart-energy app.

## How it works
Smart energy app takes as an input for each charging the length of the charging and when we want to finish charging. 
Having such inputs, it searches for the least expensive hours before expected finish time, and it triggers charging
via Home Assistant REST api. During the night we could have hours with low prices mixed with higher ones, for charging
it is beneficial to have a single continuous time slot. To address this problem, application gives weights to hours 
in an allowed charging period, weight is proportional to continuous number of hours with the same price. Next hours
in the allowed charging period are sorted by price and weight, so the lowest prices with the longest continuous period 
are selected as first, app takes as many hours as it is required by charging time and next it plans when Tuya switch 
should be turned on or off. 
If we have single continuous charging period application will plan single action to turn on and single action
to turn off Tuya switch, If charging period has breaks, we will have more such actions.     



## How it is implemented
Module `server` contains NodeJs application which exposes REST API endpoints for ReactJs fronted application 
from `wepp-app` module. Endpoints exposed by server allow fetching the price list and schedule charging. 
Charging planning and execution is executed by server. 
Price list is not exposed by any REST api it is presented on the website which is scraped by server with puppeteer help.
Server caches Price lists so website with prices is called only once a day when a new price list for 
the next day is published. Module `api` contains TypeScript interfaces common for NodeJs app and for ReactJs

Apart from scheduling battery charging, this application also controls battery charging level by connecting with
Audi servers from which current battery level is fetched, and when battery level is over recommended 80%,
it cancels current charging. 

## Deployment
The best hosting for the app is Raspberry Pi which is enough to host express web server and Home Assistance instance.
Home Assistance instance should be integrated with Tuya cloud application.