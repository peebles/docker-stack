# docker-stack

A management tool for Docker based multi-image/container deployments.  Like docker-compose, but
allows each service to specify its own docker-machine.  Unlike docker-compose in that it allows you
to run docker-compose commands as well as docker commands, and even custom defined commands.

## Usage

```bash
npm install -g docker-stack

docker-stack [-d,--debug] [-n] [--env,-e VAR=VALUE ...] [-m,--machine docker-machine] [-f,--file docker-stack.yml] \
  COMMAND [options] [CONTAINER|ALL] [args]
```

Keeping in mind that each service in the `docker-stack.yml` file can belong to its own unique docker machine, the following
examples give you an idea of what it can do:

```bash
docker-stack build
docker-stack up -d
docker-stack exec -it portal bash
docker-stack log --tail=50 -f portal
docker-stack restart database
docker-stack mycommand -b v1.2 ALL
```

## Config File

`docker-stack` uses a super set of the docker-compose config file.  In fact, you'll probably start
with an existing docker-compose file and add to it.  A typical section in a docker compose file
might look like this:

```yaml
portal:
  build: .
  dockerfile: Dockerfile.portal
  container_name: portal
  restart: always
  ports:
    - "80:3000"
```

`docker-stack` looks for three additional properties:

```yaml
portal:
  build: .
  dockerfile: Dockerfile.portal
  container_name: portal
  restart: always
  ports:
    - "80:3000"
  container-type: application
  docker-machine: staging-portal
  commands:
    update: run.sh update
```

The `container-type` tells docker-stack what kind of services this is.  It can be one of "application", "service" or "data".
When you run docker-stack with a command to operate on all sections, its really only operates on the sections where `container-type`
is equal to "application".

The `docker-machine` tells docker-stack which machine this container runs one.

And `commands` lists a set of custom commands you can run on this container.

What makes `docker-stack` useful is that, when doing a docker-compose command (like build or up), docker-stack will create
temporary docker compose files based on the "docker-machine" setting for the services, execute a "docker-machine env" and
then each docker-compose file.  When doing docker commands (exec, logs, etc) docker-stack will do the required "docker-machine env"
for you.

`docker-stack` will also look for a special section in the docker-stack.yml file, called "stack" that looks like this:

```yaml
stack:
  name: local
  environment:
    NODE_ENV: local
  docker-machine: local-bi
  docker-machine-env: docker-machine env
  commands:
    roll: forever restartall
    update: run.sh update
```

The "name" is passed as the -p option to docker-compose, which affects the name of the images docker-compose builds
(known as the project name).  The environment is exposed on `process.env` before commands are run.  The "docker-machine"
if specified here becomes the default for each section, unless the section overrides it.  The "docker-machine-env" is the
command to run to get the machine environment (it defaults to "docker-machine env").  And the "commands" section become
global commands that each container will understand.

