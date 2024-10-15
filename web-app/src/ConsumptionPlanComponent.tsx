
import { ConsumptionPlan, ConsumptionPlanItem, CurrencyUtils, DateTimeUtils, PricelistItem, SwitchAction } from 'smart-power-consumer-api';

const renderPriceItem = (consumptionPlanItem: ConsumptionPlanItem) => {
    const rowSpan = consumptionPlanItem.switchActions.length > 1 ? 2 : 1;
    const pricelistItem = consumptionPlanItem.pricelistItem;
    return (
        <>
            <td rowSpan={rowSpan}>{DateTimeUtils.getTime(pricelistItem.startsAt)}</td>
            <td rowSpan={rowSpan} className={`price-${pricelistItem.category}`}>{CurrencyUtils.format(pricelistItem.price)}</td>
        </>
    )
}
const renderSwitchAction = (switchAction: SwitchAction) => {
    return (
        <>
                <td>{DateTimeUtils.formatDateTime(switchAction.at)}</td>
                <td>{switchAction.switchOn ? "ON": "OFF"}</td>
                <td>{switchAction.state}</td>
                <td>{switchAction.result}</td>
        </>
    )
}

const renderRow = (consumptionPlanItem: ConsumptionPlanItem, index: number): JSX.Element => {
    const switchActions = consumptionPlanItem.switchActions;
    if( switchActions.length == 0 ) {
        return (
            <tr key={index}>
                <td colSpan={4}></td>
                {renderPriceItem(consumptionPlanItem)}
            </tr>
        )
    }

    if( switchActions.length == 1 ) {
        return (
            <tr key={index}>
                {renderSwitchAction(switchActions[0])}
                {renderPriceItem(consumptionPlanItem)}
            </tr>
        )
    }

    if( switchActions.length == 2 ) {
          return (
            <>
                <tr key={index}>
                    {renderSwitchAction(switchActions[0])}
                    {renderPriceItem(consumptionPlanItem)}
                </tr>
                <tr key={index+10}>
                    {renderSwitchAction(switchActions[1])}
                </tr>
            </>
          )
    }
    
}



export const ConsumptionPlanComponent = (consumptionPlan: ConsumptionPlan) => {
  const numberOfColumns = 6;
  return (
    <div>
        <table className="consumptionPlanTable">
          <thead>
            <tr>
              <th colSpan={numberOfColumns}>Consumption plan created at: {DateTimeUtils.formatDateTime(consumptionPlan.createdAt)}</th>
            </tr>
            <tr>
              <th colSpan={numberOfColumns}>Charge duration: {DateTimeUtils.formatTime(consumptionPlan.consumptionDuration)}</th>
            </tr>
            <tr>
              <th colSpan={numberOfColumns}>Finish at: {DateTimeUtils.formatDateTime(consumptionPlan.finishAt)}</th>
            </tr>
            <tr>
              <th colSpan={numberOfColumns}>Status: {consumptionPlan.state}</th>
            </tr>
            <tr>
                <th>Switch Action Time</th>
                <th>Switch Action</th>
                <th>Switch Action Status</th>
                <th>Switch Action Result</th>
                <th>Pricelist time</th>
                <th>Price [PLN/kWh]</th>
            </tr>
          </thead>
            <tbody>
              {consumptionPlan.consumptionPlanItems.map((consumptionPlanItem: ConsumptionPlanItem, consumptionPlanItemIndex) => (
                renderRow(consumptionPlanItem, consumptionPlanItemIndex)  
              ))}
            </tbody>
    
        </table>
    </div>
  );
};