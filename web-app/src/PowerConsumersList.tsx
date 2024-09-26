import { useState, useEffect } from 'react';
import { PowerConsumerComponent } from './PowerConsumerComponent';

export const PowerConsumersList = () => {
    const [powerConsumersList, setPowerConsumersList] = useState([]);
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
                <PowerConsumerComponent powerConsumer={powerConsumer}/>
              ))}
        </div>
    );

};