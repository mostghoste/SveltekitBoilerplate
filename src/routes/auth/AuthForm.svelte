<form class="flex flex-col gap-2" method="POST" action="/auth?/login">
	<label>
		Email
		<input class="input input-bordered" name="email" type="email" />
	</label>
	<label>
		Password
		<input class="input input-bordered" name="password" type="password" />
	</label>
	<footer>
		<button class="btn btn-primary" type="submit">Login</button>
		<button class="btn btn-secondary" formaction="/auth?/signup">Sign up</button>
	</footer>
</form>
