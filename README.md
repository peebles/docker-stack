# docker-stack

A management tool for Docker based multi-image/container deployments.  Like docker-compose, but
allows each service to specify its own docker-machine.  Unlike docker-compose in that it allows you
to run docker-compose commands as well as docker commands, npm scripts and even custom defined
commands.

## Config File

`docker-stack` uses a super set of the docker-compose config file.  In fact, you'll probably start
with an existing docker-compose file and add to it.

### Stack Configuration

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

`docker-machine` and `commands` can also be specified in individual service sections to over ride the
global defaults in the stack configuration section, if needed.

In addition, each servie section must specify a `container-type`; one of "application", "service" or
"dataContainer".

