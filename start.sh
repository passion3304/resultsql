#!/bin/bash
export NODE_ENV="production"
export PORT="3010"
pm2 start npm --name 'sport_categories' -- run start
