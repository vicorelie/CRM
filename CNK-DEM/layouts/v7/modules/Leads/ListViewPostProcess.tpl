	</div>
</div>

<script>
/* Fix Android Chrome : le clavier virtuel se ferme immédiatement sur les inputs de recherche.
   navigator.virtualKeyboard.overlaysContent = true (Chrome 94+) empêche le clavier
   de déclencher tout resize/scroll. */
if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
}
</script>
