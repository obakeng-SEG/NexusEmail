{if $nexus_brand_protection_error}
  <div class="alert alert-danger">
    {$nexus_brand_protection_error|escape}
  </div>
{else}
  <p>Nexus Brand Protection is ready for your account.</p>
  <p>
    <a class="btn btn-primary" href="{$nexus_brand_protection_url|escape}" target="_blank" rel="noopener">
      Open Nexus Brand Protection
    </a>
  </p>
{/if}
