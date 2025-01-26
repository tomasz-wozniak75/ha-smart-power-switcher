# Smart energy home automation

## Purpose
In Poland, there is an electricity tariff in which prices are changing on an hourly basis due to actual power supply and consumption. 
Consumers could benefit from low prices during nights or when there is a strong wind or sunny day that causes energy over production.
Prices in this tariff are based on [Day Ahead market](https://tge.pl/electricity-dam) which publishes prices at 2pm each day for 
the next 24 hours. 


This project is intended to charge car batteries in the hours when it is profitable. Charging is controlled 
by [Tuya smart switches](https://www.tuya.com/) but Tuya application has only simple automation not sufficient 
for this task. Tuya exposes REST API but is not free of charge, 
fortunately Tuya could be integrated with [Home Assistant](https://www.home-assistant.io/) application which 
has free REST API which could be used by smart-energy app.


## How it works

Smart energy app takes as an input for each charging the charging length and desired charging finish time, 
the best is to set it to the next departure. Having such inputs, application searches for the least expensive hours
 before expected finish time, and next it triggers charging via Home Assistant REST api. 


 During nights we could have hours with low prices mixed with higher ones, for charging
it is beneficial to have a single continuous time slot. To address this problem, application gives weights to hours 
in the allowed charging period. Weight is proportional to continuous number of hours with the same price. Next hours
in the allowed charging period are sorted by price and weight, so the lowest prices with the longest continuous period 
are selected as first ones. App takes as many hours as it is required by charging time and next it plans when Tuya switch 
should be turned on or off. 

If we have single continuous charging period application will plan single action to turn on switch and single action
to turn off it, If charging period has breaks, we will have more switch actions.     

Central point of the rust server is [PowerConsumersService](rusty-server/src/power_consumers/power_consumers_service.rs) and [PowerConsumer](rusty-server/src/power_consumers/power_consumer.rs)


## How it is implemented
Server part initially was implemented as NodeJs server, but now it is being migrated to Rust application, which uses
`axum` to expose REST endpoints 

Module [rusty-server](./rusty-server) contains application based on 'axum', and [server](./server) previous server version 
which is based on NodeJs and Express.

Server exposes REST API endpoints for ReactJs fronted application from module [web-app](./web-app). Endpoints exposed
by server allow for fetching the price list and schedule charging. Charging planning and execution is performed by server. 



## Deployment
The best hosting for the app is Raspberry Pi which is enough to host express web server and Home Assistance instance.
Home Assistance instance should be integrated with Tuya cloud application.