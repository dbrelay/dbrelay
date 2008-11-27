
build:
	$(MAKE) -f objs/Makefile

install:
	$(MAKE) -f objs/Makefile install

clean:
	rm -rf Makefile objs

upgrade:
	/tmp/viaduct/sbin/nginx -t

	kill -USR2 `cat /tmp/viaduct/logs/nginx.pid`
	sleep 1
	test -f /tmp/viaduct/logs/nginx.pid.oldbin

	kill -QUIT `cat /tmp/viaduct/logs/nginx.pid.oldbin`

upgrade1:
	# upgrade 0.1.x to 0.2+

	/tmp/viaduct/sbin/nginx -t

	cp /tmp/viaduct/logs/nginx.pid /tmp/viaduct/logs/nginx.pid.oldbin

	kill -USR2 `cat /tmp/viaduct/logs/nginx.pid`
	sleep 1
	test -f /tmp/viaduct/logs/nginx.pid.oldbin

	cp /tmp/viaduct/logs/nginx.pid /tmp/viaduct/logs/nginx.pid.newbin

	kill -QUIT `cat /tmp/viaduct/logs/nginx.pid.oldbin`
