export declare type types = 'error' | 'warning';
export declare function emit(type: types, ...args: any): void;
export declare function on(type: types, handler: Function): void;
