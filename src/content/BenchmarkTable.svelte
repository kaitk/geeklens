<script lang="ts">
    export let instructions: Array<{name: string, type: string}>;

    function getBadgeClass(type: string): string {
        switch (type) {
            case "AVX-512": return "gb-instr-avx512";
            case "AVX": return "gb-instr-avx";
            case "SSE": return "gb-instr-sse";
            case "AES": return "gb-instr-aes";
            case "SHA": return "gb-instr-sha";
            default: return "gb-instr-default";
        }
    }
</script>

<div class="gb-instruction-container">
    {#each instructions as instruction}
    <span class="gb-instruction-badge {getBadgeClass(instruction.type)}">
      {instruction.name}
    </span>
    {/each}
</div>

<style>
    .gb-instruction-container {
        margin-top: 5px;
        display: flex;
        flex-wrap: wrap;
    }

    .gb-instruction-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        margin-right: 4px;
        margin-top: 4px;
    }

    .gb-instr-avx512 { background-color: #dbeafe; color: #1e40af; }
    .gb-instr-avx { background-color: #e0f2fe; color: #0369a1; }
    .gb-instr-sse { background-color: #ffedd5; color: #9a3412; }
    .gb-instr-aes { background-color: #dcfce7; color: #166534; }
    .gb-instr-sha { background-color: #bbf7d0; color: #15803d; }
    .gb-instr-default { background-color: #f3f4f6; color: #374151; }
</style>
