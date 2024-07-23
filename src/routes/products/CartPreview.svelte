<script>
	import { cart } from '../stores/cart';

	// Subscribe to the cart store
	let CartProducts = [];
	$: cart.subscribe((value) => {
		CartProducts = value;
	});

	// Helper functions from the cart store
	const { removeFromCart, clearCart } = cart;
</script>

{#if CartProducts && CartProducts.length > 0}
	<ul>
		{#each CartProducts as product}
			<li>
				{JSON.stringify(product)}
				<button on:click={() => removeFromCart(product.id)}>Remove</button>
			</li>
		{/each}
	</ul>
	<button on:click={clearCart}>Clear Cart</button>
{:else}
	<p>Your cart is empty</p>
{/if}
