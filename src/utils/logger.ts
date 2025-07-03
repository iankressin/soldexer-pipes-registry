interface Logger {
	info(message: string, ...args: any[]): void
	error(message: string, ...args: any[]): void
	warn(message: string, ...args: any[]): void
	debug(message: string, ...args: any[]): void
}

class SimpleLogger implements Logger {
	private getTimestamp(): string {
		return new Date().toISOString()
	}

	private formatMessage(level: string, message: string, ...args: any[]): string {
		const timestamp = this.getTimestamp()
		const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : ''
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`
	}

	info(message: string, ...args: any[]): void {
		console.log(this.formatMessage('info', message, ...args))
	}

	error(message: string, ...args: any[]): void {
		console.error(this.formatMessage('error', message, ...args))
	}

	warn(message: string, ...args: any[]): void {
		console.warn(this.formatMessage('warn', message, ...args))
	}

	debug(message: string, ...args: any[]): void {
		if (process.env.NODE_ENV === 'development') {
			console.debug(this.formatMessage('debug', message, ...args))
		}
	}
}

export const logger: Logger = new SimpleLogger()
