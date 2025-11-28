docker-compose-path := srcs/docker-compose.yaml

all : run

run : init front 
	uid=$(shell id -u) gid=$(shell id -g) docker compose -f $(docker-compose-path) up -d --build

down :
	docker compose -f $(docker-compose-path) down

logs :
	docker compose -f $(docker-compose-path) logs


clean :
	docker rm $$(docker ps -aq)

fclean: down clean
	docker rmi $$(docker image ls -aq)

re : fclean all

init:
	./setup.sh

devfront: down
	cd srcs/frontend/data && npm install && npm run dev
front:
	cd srcs/frontend/data && npm install && npm run build


# <--- DEV TOOLS--->
nodeclean:
	find -type d -name data -exec sudo sh -c 'cd "{}" && npm run fclean' \;

.PHONY: all run clean fclean re
.IGNORE: clean fclean re