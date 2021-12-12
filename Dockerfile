FROM node:15

WORKDIR /blupiapp   

COPY package*.json . 
RUN npm install
COPY . .
CMD node index.js