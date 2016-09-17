# Usage

    docker-stack -f staging.yml -e NODE_ENV=staging (-e ...)
        command [options] [container] [arguments]

commands: all docker commands

custom commands: update, restart, exec, (?machine?)

    ?? docker-stack machine --create --driver=aws --profile=iv --hostname=foobar --itype=t2.medium

If a command is not know, try "npm run command -- options"?

api-server:
  container-type: application
  docker-machine: bi-apiserver-staging
  commands:
    restart: forever restartall
    update: update

docker-stack restart api-server
  => docker exec -it api-server forever restartall
  
docker-stack update api-server -b v1.2
  => docker exec -it api-server update -b v1.2

1.  Check if application has the command and if so:

    docker exec -it <options> <machine> <arguments>

    ex.
    docker-stack restart api-server
      => docker exec -it api-server forever restartall
    docker-stack update -b v1.2
      => docker exec -it api-server update -b v1.2

2.  If the command is a compose command, run compose

    ex.
    docker-stack build api-server
      => docker-compose -f xxx.yml build apiserver
    docker-stack up -d
      => docker-compose -f xxx.yml up -d

3.  Finally, assume the command is a docker command

    ex.
    docker-stack logs --tail=50 -f api-server
      => docker logs --tail=50 -f api-server

** iteration is only done over container-type==application.  #1 is not done on container-type==service.

## Special Section

stack:
  name: staging
  environment:
    NODE_ENV: statging
  docker-machine: local-bi // can be over-ridden by individual

** docker-machine==localhost is special, so no docker-machine env stuff is done and assumes the
** local machine is running docker native.

