"""
This script updates stock ticker codes in transaction history files.

On the portal, export the transaction history for each account.

Rename the exported file to original.txt (see ORIGINAL_FILE_PATH = "original.txt").

Set the ticker code you want to update:

Original: ORIGINAL_STRING = "USSPLG"

Updated: UPDATED_STRING = "USSPYM"

After running the script, a file named updated.txt will be generated. Upload this file back to the same account on the portal.
"""

import sys

ORIGINAL_FILE_PATH = "original.txt"
UPDATED_FILE_PATH = "updated.txt" # This is the file we will create
ORIGINAL_STRING = "USSPLG"
UPDATED_STRING = "USSPYM"

def transform_file(original_file, new_file_path, str_from, str_to):
    """
    Reads the original file, filters for lines containing str_from,
    replaces str_from with str_to, and saves to a new file.
    Returns True on success, False on failure.
    """
    print(f"--- Step 1: Transforming File ---")
    print(f"Reading from: {original_file}")
    print(f"Writing to:   {new_file_path}\n")

    transformed_lines = 0
    try:
        # Open the original file for reading and the new file for writing
        with open(original_file, 'r') as f_in, open(new_file_path, 'w') as f_out:
            for line in f_in:
                line = line.strip() # Remove leading/trailing whitespace
                if str_from in line:
                    # Found a line, transform it
                    new_line = line.replace(str_from, str_to)
                    f_out.write(new_line + "\n") # Add newline back
                    transformed_lines += 1

        print(f"Successfully processed and saved {transformed_lines} lines to {new_file_path}.")
        print("--- Step 1: Complete ---\n")
        return True # Indicate success

    except FileNotFoundError:
        print(f"--- ERROR (Transform) ---")
        print(f"Original file not found: {original_file}")
        print("Please make sure this file is in the same directory as the script.")
        return False # Indicate failure
    except IOError as e:
        print(f"--- ERROR (Transform) ---")
        print(f"Could not write to new file: {new_file_path}")
        print(f"Error: {e}")
        return False # Indicate failure

def verify_transformation(original_file, updated_file, str_from, str_to):
    """
    Compares two files to verify that lines containing str_from in the original
    file match lines containing str_to in the updated file, with str_from
    replaced by str_to.
    """

    original_lines_to_check = []
    updated_lines_to_check = []

    # --- 1. Read the original file ---
    try:
        with open(original_file, 'r') as f:
            for line in f:
                line = line.strip() # Remove leading/trailing whitespace
                if str_from in line:
                    original_lines_to_check.append(line)
    except FileNotFoundError:
        print(f"--- ERROR (Verify) ---")
        print(f"Original file not found: {original_file}")
        return

    # --- 2. Read the updated file ---
    try:
        with open(updated_file, 'r') as f:
            for line in f:
                line = line.strip() # Remove leading/trailing whitespace
                if str_to in line:
                    updated_lines_to_check.append(line)
    except FileNotFoundError:
        print(f"--- ERROR (Verify) ---")
        print(f"Updated file not found: {updated_file}")
        print(f"This file should have been created in Step 1.")
        return

    # --- 3. Start Verification ---
    print(f"Found {len(original_lines_to_check)} lines with '{str_from}' in {original_file}.")
    print(f"Found {len(updated_lines_to_check)} lines with '{str_to}' in {updated_file}.")

    # Check for line count mismatch
    if len(original_lines_to_check) != len(updated_lines_to_check):
        print("\n--- VERIFICATION FAILED ---")
        print("The number of relevant lines does not match.")
        print(f"Original file had {len(original_lines_to_check)} lines.")
        print(f"Updated file has {len(updated_lines_to_check)} lines.")
        return

    if not original_lines_to_check:
        print("\n--- VERIFICATION SUCCESSFUL ---")
        print("No lines with '{str_from}' were found in the original, and none with '{str_to}' in the new file.")
        return

    # Check line-by-line content
    mismatches = 0
    for i in range(len(original_lines_to_check)):
        original_line = original_lines_to_check[i]
        updated_line = updated_lines_to_check[i]

        # Create what the 'updated' line *should* look like
        expected_line = original_line.replace(str_from, str_to)

        if expected_line != updated_line:
            print(f"\n--- MISMATCH FOUND (line {i+1} of comparison) ---")
            print(f"  Original (transformed): {expected_line}")
            print(f"  Updated (as found):     {updated_line}")
            mismatches += 1

    # --- 4. Final Report ---
    if mismatches == 0:
        print("\n--- VERIFICATION SUCCESSFUL ---")
        print("All relevant lines were transformed correctly.")
    else:
        print(f"\n--- VERIFICATION FAILED ---")
        print(f"Found {mismatches} mismatched lines.")

# --- Main execution ---
if __name__ == "__main__":
    print(f"Starting combined script...")
    print(f"Original file: {ORIGINAL_FILE_PATH}")
    print(f"New file to create:  {UPDATED_FILE_PATH}")
    print(f"Transforming '{ORIGINAL_STRING}' -> '{UPDATED_STRING}'\n")

    # --- Step 1: Transform the file ---
    # This function will create the 'updated.txt' file
    success = transform_file(ORIGINAL_FILE_PATH, UPDATED_FILE_PATH, ORIGINAL_STRING, UPDATED_STRING)

    # --- Step 2: Verify the transformation ---
    # Only run verification if Step 1 was successful
    if success:
        print(f"--- Step 2: Verifying Transformation ---")
        # Pass the same paths to the verification function
        verify_transformation(ORIGINAL_FILE_PATH, UPDATED_FILE_PATH, ORIGINAL_STRING, UPDATED_STRING)
        print("--- Step 2: Complete ---")
    else:
        print("\nVerification step skipped due to transformation error.")

    print("\nScript finished.")
