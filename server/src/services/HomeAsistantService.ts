

export class HomeAsistantService {
    private haToken: string | null;
    private haUrl: string | null;

    public constructor (haToken: string | null = null, haUrl: string | null = null) {
        this.haToken = haToken;
        this.haUrl = haUrl;
    }

    public async switchDevice(deviceName: string, switchOn: boolean): Promise<void> {
        if (this.haUrl != null) {
            const operation = switchOn ? 'turn_on' : 'turn_off';
            const path = `${this.haUrl}/api/services/switch/${operation}`;
            const body =  {"entity_id": deviceName}
            
            const response = await fetch(path, { 
                method: "post",
                headers: { 
                    'Authorization': `Bearer ${this.haToken}`, 
                    'Accept': 'application/json' 
                },
                body: JSON.stringify(body), 
            }) ;
            if ( response.ok) {
                console.log(`homeAsistantService.switchDevice ${this.haUrl}`);
            } else {
                throw new Error(`${response.statusText} : ${response.text()}`)
            }
        }

    }
}