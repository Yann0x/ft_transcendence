docker-compose-path := srcs/docker-compose.yaml

all : run

run :
	docker compose -f $(docker-compose-path) up

clean :

	docker rm $$(docker ps -aq)

fclean: clean
	docker rmi $$(docker image ls -aq)

re : fclean all


front:
	cd srcs/frontend && npm install && npm run build

.PHONY: all run clean fclean re
.IGNORE: clean fclean re