# Local PostgreSQL

This directory contains the Docker Compose development database for the Seafood Export CRM. It starts PostgreSQL only; application services and schema migrations are managed separately.

## Prerequisites

- Docker Desktop or Docker Engine with the Docker Compose plugin.
- A running Docker daemon.

## Environment configuration

From the repository root, copy the example and set a unique local password:

```sh
cp docker/.env.example docker/.env
```

Edit `docker/.env` before starting. The file is ignored by Git. The default host port is `5432`; change `POSTGRES_PORT` if that port is already in use. The database is exposed only on loopback (`127.0.0.1`) and is not reachable from other hosts.

## Start and stop

Run from any directory:

```sh
bash docker/start.sh
bash docker/stop.sh
```

`start.sh` validates Docker, the daemon, required environment variables, and the Compose file; it starts PostgreSQL and waits up to 60 seconds for its health check. Re-running it is safe. `stop.sh` removes the stopped container and Compose network without deleting the database volume. To start again, run `start.sh`.

## Connection details

With the example values, connect using:

- Host: `127.0.0.1`
- Port: value of `POSTGRES_PORT` (default `5432`)
- Database: value of `POSTGRES_DB` (default `seafood_crm`)
- User: value of `POSTGRES_USER` (default `crm_app`)
- Password: value of `POSTGRES_PASSWORD` in `docker/.env`

For example, with `psql` installed:

```sh
PGPASSWORD='<your-local-password>' psql -h 127.0.0.1 -p 5432 -U crm_app -d seafood_crm
```

Avoid putting real passwords in shell history or shared logs.

## Health check

Compose checks readiness with `pg_isready` every five seconds. Inspect status and logs with:

```sh
docker compose -f docker/compose.yaml ps
docker compose -f docker/compose.yaml logs postgres
```

The service becomes healthy after PostgreSQL accepts connections for the configured user and database.

## Persistence

PostgreSQL data lives in the named `postgres_data` volume. Stopping the service preserves it. Do not use `docker compose down --volumes` unless you intentionally want to delete local database data. Changing `POSTGRES_DB`, `POSTGRES_USER`, or `POSTGRES_PASSWORD` does not rewrite an already-initialized data directory; recreate the volume only when local data loss is intended.

## Troubleshooting

- **Docker daemon unavailable:** start Docker Desktop/Engine, then rerun the script.
- **Missing `.env`:** copy `.env.example` and replace the placeholder password.
- **Port already in use:** set another `POSTGRES_PORT` in `.env` and rerun.
- **Container unhealthy:** inspect `docker compose -f docker/compose.yaml logs postgres`; verify the environment file and available disk space.
- **Credentials changed but login still fails:** PostgreSQL initialization variables apply only to a new data volume. Keep the volume and rotate credentials using PostgreSQL commands, or deliberately remove the local volume if the data is disposable.
