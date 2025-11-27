FROM node:24

WORKDIR /data

COPY ./entrypoint.sh /
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]