#!/bin/sh

aws s3 sync . s3://sprancher-dashboard2/dashboard/print-test/ --acl public-read --exclude "*.map" --exclude ".*" --exclude "*.scss" --exclude "*.md" --exclude "*.sh" --delete
