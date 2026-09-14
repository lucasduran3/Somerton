
# Somerton

Aplicación de salas de chats anónimas en tiempo real sobre películas.

## API - Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/movies/search` | Búsqueda de películas con filtros |
| `GET` | `/api/movies/genres` | Obtención de los géneros disponibles |
| `GET` | `/api/rooms` | Búsqueda de salas con filtros |

## Socket - Events
#### Cliente --> Servidor
| Evento | Descripción |
|---|---|
 | `room:create` | Se emite cuando se crea una sala |
| `room:join` | Se emite cuando un usuario se une a una sala |
| `room:leave` | Se emite cuando un usuario abandona una sala |
| `room:delete` | Se emite cuando un usuario elimina una sala |
| `room:message-send` | Se emite cuando un usuario envia un mensaje |
| `room:kick` | Se emite cuando el dueño de la sala expulsa a otro usuario |
| `room:disconnect` | Se emite cuando un usuario se desconecta de la sala |

#### Servidor --> Cliente

| Evento | Descripción |
|---|---|
| `room:already-in-room` | Se emite cuando un usuario intenta a unirse a una sala en la que ya se encuentra |
| `room:movie-taken` | Se emite cuando un usuario intenta crear una sala sobre una película ya en uso |
| `room:full` | Se emite cuando un usuario intenta unirse a una sala llena |
| `room:joined` | Se emite cuando un usuario se une con éxito a una sala. Actualiza los datos de la sala |
| `room:user-joined` | Se emite cuando un usuario se una a una sala para notificar solo a otros usuarios de la misma |
| `room:error` | Se emite cuando se produce un error en algún evento |
| `room:left` | Se emite cuando un usuario abandona una sala para actualizar los datos de la misma. |
| `room:user-left` | Se emite cuando un usuario abandona con éxito una sala. Notifica solo a los usuarios dentro de la sala |
| `message:error` | Se emite cuando se produce un error al enviar un mensaje a una sala |
| `message:received` | Se emite cuando un mensaje llega con éxito a la sala  |
| `room:kicked` | Se emite solo al usuario que ha sido expulsado de la sala |
| `room:user-kicked` | Se emite a todos los usuarios de una sala cuando se expulsa a uno |