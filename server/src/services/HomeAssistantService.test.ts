import { expect, test, jest} from '@jest/globals';
import { HomeAsistantService } from "./HomeAsistantService";

test("homeAsistantService should switch device", async () => {
    const token = "todo"
    const url = "http://192.168.68.63:8123";
    const homeAsistantService = new HomeAsistantService(token, url);

    //await homeAsistantService.switchDevice("switch.audi_charger_breaker_switch", false);
    await homeAsistantService.switchDevice("switch.smart_plug_socket_1", false);
});