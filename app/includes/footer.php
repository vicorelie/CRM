<?php
// includes/footer.php
?>
<!-- Footer -->
<footer class="mt-5 py-4">
    <div class="partial-border"></div>
    <div class="container text-center">
        <p class="mb-0">
            &copy; <?= date("Y") ?> WanaTest. 
            <?= htmlspecialchars($lang_data['footer_all_rights_reserved']) ?>
            | <a href="contact.php"><?= htmlspecialchars($lang_data['footer_contact']) ?></a>
            <!-- Lien vers Mentions Légales -->
            | <a href="mentionsLegales.php"><?= htmlspecialchars($lang_data['footer_legal_notice']) ?></a>
            <!-- Lien vers Conditions Générales de Vente -->
            | <a href="cgv.php"><?= htmlspecialchars($lang_data['terms_and_conditions']) ?></a>
            <!-- Lien vers Politique de Confidentialité -->
            | <a href="privacyPolicy.php"><?= htmlspecialchars($lang_data['privacy_title']) ?></a>
        </p>
    </div>
</footer>


    
    <!-- Inclusion unique de Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Inclusion des scripts personnalisés (si nécessaire) -->
    <!-- <script src="assets/js/custom.js"></script> -->
    
    <!-- Optionnel : Inclusion de FontAwesome (si non déjà inclus dans le header) -->
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/js/all.min.js"></script> -->
</body>
</html>
