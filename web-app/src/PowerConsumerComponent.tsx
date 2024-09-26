import { useState, useEffect } from 'react';
import { DateTimeUtils } from 'smart-power-consumer-api';


const calculateFinishAt = () => {
     const now = new Date();
    return now.getHours() < 16 ? now.getTime() + 2 * 3600 * 1000 : DateTimeUtils.addDays(new Date(now.getFullYear(), now.getDate(), 7).getTime() , 1);
}

export const PowerConsumerComponent = ({powerConsumer = {"name": null}}) => {
    const [consumptionDuration, setConsumptionDuration] = useState(90);
    const [finishAt, setFinishAt] = useState(calculateFinishAt());

    return (
        <div>
            <header>{powerConsumer.name}</header>
        </div>
    );
}