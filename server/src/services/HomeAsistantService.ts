

export class HomeAsistantService {
    public async    switchDevice(deviceName: string, switchOn: boolean): Promise<void> {
        const ha_url = process.env.HA_URL
        console.log(`homeAsistantService.switchDevice ${ha_url}`);

    }
}