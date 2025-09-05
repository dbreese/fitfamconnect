export type ServerResponse = {
    responseCode: number;
    body: {
        message: string;
        data?: any;
    };
};
