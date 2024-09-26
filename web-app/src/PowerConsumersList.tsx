import { useState, useEffect } from 'react';
import { PowerConsumerComponent } from './PowerConsumerComponent';
import { PowerConsumerModel } from 'smart-power-consumer-api';

export const PowerConsumersList = () => {
    const [powerConsumersList, setPowerConsumersList] = useState<PowerConsumerModel[]>([]);
    useEffect(() => {
        fetch("/power-consumer/")
        .then((res) => {
            return res.json();
        })
        .then((data) => {
            setPowerConsumersList(data);
        });
    }, []);

   return (
        <div>
            {powerConsumersList.map((powerConsumer) => (
                <PowerConsumerComponent {...powerConsumer}/>
              ))}
        </div>
    );

};