// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as http from "http";
import * as socketio from "socket.io";
import { WebviewPanel } from "vscode";
import { SERVER_INFO } from "./constants";

export class DebuggerCommunicationServer {
    private port: number;
    private serverHttp: http.Server;
    private serverIo: socketio.Server;
    private simulatorWebview: WebviewPanel | undefined;

    constructor(
        webviewPanel: WebviewPanel | undefined,
        port = SERVER_INFO.DEFAULT_SERVER_PORT
    ) {
        this.port = port;
        this.serverHttp = new http.Server();
        this.initHttpServer();

        this.serverIo = socketio(this.serverHttp);
        this.simulatorWebview = webviewPanel;
        this.initEventsHandlers();
        console.info(`Server running on port ${this.port}`);

    }

    public closeConnection(): void {
        this.serverIo.close();
        this.serverHttp.close();
        console.info("Closing the server");
    }

    public setWebview(webviewPanel: WebviewPanel | undefined) {
        this.simulatorWebview = webviewPanel;
    }


    public emitInputChanged(newState:string):void{
        this.serverIo.emit("input_changed",newState)
    }

    private initHttpServer(): void {
        this.serverHttp.listen(this.port);
        if (!this.serverHttp.listening) {
            throw new Error(SERVER_INFO.ERROR_CODE_INIT_SERVER);
        }
    }

    private initEventsHandlers(): void {
        this.serverIo.on("connection", (socket: any) => {
            console.log("Connection received");

            socket.on("updateState", (data: any) => {
                this.handleState(data);
            });

            socket.on("disconnect", () => {
                console.log("Socket disconnected");
                if (this.simulatorWebview) {
                    this.simulatorWebview.webview.postMessage({
                        command: "reset-state",
                    });
                }
            });
        });
    }

    private handleState(data: any): void {
        try {
            console.log("handleState")
            const messageToWebview = JSON.parse(data);
            console.log(messageToWebview)
            if (messageToWebview.type === "state") {
                console.log(`State recieved: ${messageToWebview.data}`);
                if (this.simulatorWebview) {
                    this.simulatorWebview.webview.postMessage({
                        active_device:this.currentActiveDevice,
                        command: "set-state",
                        state: JSON.parse(messageToWebview.data),
                    });
                }
            }
        } catch (err) {
            console.error(`Error: Non-JSON output from the process :  ${data}`);
        }
    }
}
