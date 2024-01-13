const colors = {
    error: '\x1b[31m',
    warning: '\x1b[33m',
    success: '\x1b[32m',
    info: '\x1b[34m'
}

const resetColor = () => '\x1b[0m';

export default class Logger {
    public constructor(private construct: Function) {}

    log(level: keyof typeof colors, msg: string) {
        console.log( `[${this.construct.name}][${new Date().toISOString()}] >>${colors[level]} ${msg} ${resetColor()}`);
     }
}