import { translate } from '../i18n/i18n';

export enum Temperatures {
    Neutral = 'neutral',
    Lighthearted = 'light',
    Urgent = 'urgent'
}

export interface Temperature {
    name: string;
    code: Temperatures;
    description: string;
}

const Neutral: Temperature = {
    name: translate('temperatures.neutral'),
    code: Temperatures.Neutral,
    description: translate('temperatures.neutralDescription')
};
const Lighthearted: Temperature = {
    name: translate('temperatures.light'),
    code: Temperatures.Lighthearted,
    description: translate('temperatures.lightDescription')
};
const Urgent: Temperature = {
    name: translate('temperatures.urgent'),
    code: Temperatures.Urgent,
    description: translate('temperatures.urgentDescription')
};

export const TemperatureModes = [Neutral, Lighthearted, Urgent];

export function temperatureForCode(code: Temperatures): Temperature {
    return TemperatureModes.find((v) => v.code == code) || Lighthearted;
}
