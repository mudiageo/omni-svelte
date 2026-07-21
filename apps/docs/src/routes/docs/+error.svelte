<script lang="ts">
	import { page } from '$app/state';
	import { ModeWatcher } from 'mode-watcher';
</script>

<h1>{page.status}</h1>
<p>{page.error?.message}</p>
<ModeWatcher />
