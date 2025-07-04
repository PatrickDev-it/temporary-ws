import { env, serve, randomUUIDv7 } from 'bun';

import type { ServerWebSocket } from 'bun';

const rooms = new Map<string, Map<string, ServerWebSocket>>();

const server = serve<any, {}>({
	fetch(req, server) {
		if (server.upgrade(req)) return;

		// handle HTTP request normally
		return new Response('Hello world!');
	},

	websocket: {
		// Send ping frames to keep connection alive
		sendPings: true,
		// this is called when a message is received
		async message(ws, data) {
			try {
				const { event, ...props } = JSON.parse(data.toString());
				if (!event) throw new Error(`Invalid event | event passed => ${event}`);

				switch (event) {
					case 'init_match': {
						const room_id = props.match_id ?? randomUUIDv7();
						if (!rooms.has(room_id)) rooms.set(room_id, new Map());

						ws.send(
							JSON.stringify({
								event: 'match_id',
								data: {
									match_id: room_id,
								},
							})
						);
						break;
					}

					case 'join_match': {
						const match_id =
							props.match_id && rooms.has(props.match_id)
								? props.match_id
								: rooms.keys().next().value!;

						const player_id = props.player_id ?? randomUUIDv7();
						rooms.get(match_id)?.set(player_id, ws);

						ws.send(
							JSON.stringify({
								event: 'player_id',
								data: {
									player_id,
								},
							})
						);

						break;
					}

					case 'player_move': {
						const [match_id, match] =
							props.match_id && rooms.has(props.match_id)
								? [props.match_id, rooms.get(props.match_id)!]
								: rooms.entries().next().value!;

						const [player_id, player_ws] =
							props.player_id && match.has(props.player_id)
								? [props.match_id, match.get(props.match_id)!]
								: match.entries().next().value!;

						player_ws.send(
							JSON.stringify({
								event: 'move',
								match_id,
								player_id,
								...props,
							})
						);

						break;
					}
				}
			} catch (error) {
				console.error(error);
			}
		},
	},
});

console.log(`Bun WebSocket server running on ws://${server.hostname}:${server.port}`);
