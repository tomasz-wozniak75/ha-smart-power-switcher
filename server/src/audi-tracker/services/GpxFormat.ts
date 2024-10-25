import { DateTimeUtils } from "smart-power-consumer-api";
import { AudiLocation } from "./LocationTrackerService";

export class GpxFormat {
    private static xmlDoctype = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>`;
    private static gpxOpeningTag = `<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Wikipedia"
                                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                                    xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`;
  
    public static convert (date: number, locations: AudiLocation[]): string {
        const generateLocationName = (location: AudiLocation): string => {
            let name = `Since: ${DateTimeUtils.formatDateTime(new Date(location.carCapturedTimestamp).getTime())}`;
            if (location.lastRefresh) {
                name += ` to: ${DateTimeUtils.formatDateTime(location.lastRefresh)}`;
            }
            return name;
        }
        const locationToWpt = (location: AudiLocation) => `
                    <wpt lat="${location.lat}" lon="${location.lon}">
                        <time>${DateTimeUtils.formatDateTime(location.carCapturedTimestamp)}</time>
                        <name>${generateLocationName(location)}</name>
                    </wpt>
        `;
        let gpxFile = this.xmlDoctype;
        gpxFile += this.gpxOpeningTag;
        gpxFile += `\n<metadata>
                        <name>${DateTimeUtils.formatDate(date)}</name>
                        <desc>Audi track file from: ${DateTimeUtils.formatDate(date)}</desc>
                        <author><name>Tomasz Wozniak</name></author>
                      </metadata>
                `;
        for (let nextLocation of locations) {
            gpxFile += locationToWpt(nextLocation);
        }
        gpxFile += "</gpx>"        
        return gpxFile;
        
    }
}


